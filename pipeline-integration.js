/**
 * Pipeline Integration Module
 * Integrates ONAV quote system with pipeline CRM
 */

class PipelineIntegration {
  constructor(supabaseAdmin) {
    this.supabaseAdmin = supabaseAdmin;
  }

  async createPipelineClient(proposalData) {
    if (!this.supabaseAdmin) return null;

    try {
      // Check if client exists
      if (proposalData.client_email) {
        const { data: existing } = await this.supabaseAdmin
          .from('clients')
          .select('id')
          .eq('email', proposalData.client_email)
          .single();

        if (existing) {
          await this.supabaseAdmin
            .from('clients')
            .update({ proposal_id: proposalData.id, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          return existing;
        }
      }

      // Get first sales stage
      const { data: firstStage } = await this.supabaseAdmin
        .from('sales_stages')
        .select('id')
        .order('position', { ascending: true })
        .limit(1)
        .single();

      // Create client
      const { data: newClient, error } = await this.supabaseAdmin
        .from('clients')
        .insert([{
          name: proposalData.client_name || proposalData.project_name || 'Unknown',
          email: proposalData.client_email,
          phone: proposalData.client_phone,
          company: proposalData.client_company,
          stage_id: firstStage?.id,
          proposal_id: proposalData.id,
          proposal_value: proposalData.total_price,
          notes: `From proposal: ${proposalData.project_name}`,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('[pipeline] Error creating client:', error.message);
        return null;
      }

      console.log(`[pipeline] Created client: ${newClient.id}`);
      return newClient;
    } catch (err) {
      console.error('[pipeline] createPipelineClient error:', err.message);
      return null;
    }
  }

  async updateClientAndCreateJob(proposalData) {
    if (!this.supabaseAdmin) return { success: false };

    try {
      // Find client
      let client = null;
      if (proposalData.client_email) {
        const { data } = await this.supabaseAdmin
          .from('clients')
          .select('*')
          .eq('email', proposalData.client_email)
          .single();
        client = data;
      }

      if (!client) {
        client = await this.createPipelineClient(proposalData);
      }

      if (!client) return { success: false, error: 'No client found' };

      // Get won stage
      const { data: wonStage } = await this.supabaseAdmin
        .from('sales_stages')
        .select('id')
        .or('name.ilike.%won%,name.ilike.%sold%,name.ilike.%fechado%')
        .limit(1)
        .single();

      if (wonStage) {
        await this.supabaseAdmin
          .from('clients')
          .update({ stage_id: wonStage.id, updated_at: new Date().toISOString() })
          .eq('id', client.id);
      }

      // Get first job stage
      const { data: firstJobStage } = await this.supabaseAdmin
        .from('job_stages')
        .select('id')
        .order('position', { ascending: true })
        .limit(1)
        .single();

      // Create job
      const { data: newJob, error } = await this.supabaseAdmin
        .from('jobs')
        .insert([{
          title: proposalData.project_name || `Job - ${client.name}`,
          client_id: client.id,
          proposal_id: proposalData.id,
          stage_id: firstJobStage?.id,
          value: proposalData.total_price,
          start_date: proposalData.shooting_dates_start,
          end_date: proposalData.shooting_dates_end,
          status: 'active',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('[pipeline] Error creating job:', error.message);
        return { success: true, client, job: null };
      }

      console.log(`[pipeline] Created job: ${newJob.id}`);
      return { success: true, client, job: newJob };
    } catch (err) {
      console.error('[pipeline] updateClientAndCreateJob error:', err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = PipelineIntegration;
